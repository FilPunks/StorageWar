// Storage War — Wallet connection & NFT ownership check module

import { setPlayerSprite, resetPlayerSprite } from './renderer.js';
import { t } from './i18n.js';

// ========== 常量 ==========

const FILPUNKS_CONTRACT = '0xf7Ceaa5DA7305b87361f9db6A300BD6D74c674D2';
const FILECOIN_CHAIN_ID_HEX = '0x13a';

const RPC_ENDPOINTS = [
  'https://api.node.glif.io/rpc/v1',
  'https://rpc.ankr.com/filecoin',
  'https://filecoin.chainup.net/rpc/v1',
];

// Path-style: <gateway>/ipfs/<cid>/<path>
const PATH_GATEWAYS = [
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cf-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://ipfs.fleek.co/ipfs/',
  'https://crustwebsites.net/ipfs/',
];

// Subdomain-style: https://<cid>.ipfs.<gateway>/<path>
const SUBDOMAIN_GATEWAYS = [
  'dweb.link',
  'cf-ipfs.com',
  'nftstorage.link',
];

const FILECOIN_CHAIN_PARAMS = {
  chainId: FILECOIN_CHAIN_ID_HEX,
  chainName: 'Filecoin Mainnet',
  nativeCurrency: { name: 'Filecoin', symbol: 'FIL', decimals: 18 },
  rpcUrls: ['https://api.node.glif.io/rpc/v1'],
  blockExplorerUrls: ['https://fvm.starboard.ventures/'],
};

// ========== 模块状态 ==========

let connectedAddress = null;
let activeRpc = null;
let _hasNft = false;
let addressChangeCallback = null;
let toastCallback = null;

// ========== 通知 ==========

export function onToast(cb) { toastCallback = cb; }
function toast(msg, sticky) {
  console.log('[Wallet]', msg);
  if (toastCallback) toastCallback(msg, sticky);
}

// ========== 直接 RPC 调用（fetch JSON-RPC，不依赖 ethers.js） ==========

async function rpcCall(method, params) {
  for (const url of RPC_ENDPOINTS) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await resp.json();
      if (json.error) { console.warn('[Wallet] RPC error:', url, json.error); continue; }
      activeRpc = url;
      return json.result;
    } catch (e) { console.warn('[Wallet] RPC fail:', url, e.message); }
  }
  throw new Error('All RPC endpoints failed');
}

const BALANCE_OF_SELECTOR = '0x70a08231';
const OWNER_OF_SELECTOR = '0x6352211e';
const TOKEN_URI_SELECTOR = '0xc87b56dd';
const TOTAL_SUPPLY_SELECTOR = '0x18160ddd';

function encodeBalanceOf(addr) { return BALANCE_OF_SELECTOR + addr.slice(2).toLowerCase().padStart(64, '0'); }
function encodeOwnerOf(id)    { return OWNER_OF_SELECTOR + id.toString(16).padStart(64, '0'); }
function encodeTokenURI(id)   { return TOKEN_URI_SELECTOR + id.toString(16).padStart(64, '0'); }

async function readBalanceOf(address) {
  const result = await rpcCall('eth_call', [{ to: FILPUNKS_CONTRACT, data: encodeBalanceOf(address) }, 'latest']);
  return BigInt(result);
}

async function readOwnerOf(tokenId) {
  const result = await rpcCall('eth_call', [{ to: FILPUNKS_CONTRACT, data: encodeOwnerOf(tokenId) }, 'latest']);
  return '0x' + result.slice(-40);
}

async function readTokenURI(tokenId) {
  const result = await rpcCall('eth_call', [{ to: FILPUNKS_CONTRACT, data: encodeTokenURI(tokenId) }, 'latest']);
  if (result === '0x') return null;
  const hex = result.slice(2);
  const strLen = parseInt(hex.slice(64, 128), 16) * 2;
  const strHex = hex.slice(128, 128 + strLen);
  let str = '';
  for (let i = 0; i < strHex.length; i += 2) {
    str += String.fromCharCode(parseInt(strHex.substr(i, 2), 16));
  }
  return str;
}

async function readTotalSupply() {
  const result = await rpcCall('eth_call', [{ to: FILPUNKS_CONTRACT, data: TOTAL_SUPPLY_SELECTOR }, 'latest']);
  return parseInt(result, 16);
}

// ========== IPFS 网关并行获取 ==========

function buildGatewayUrls(ipfsUri) {
  const match = ipfsUri.match(/^ipfs:\/\/([^/]+)(\/.*)?$/);
  if (!match) return [ipfsUri]; // already an HTTP URL
  const cid = match[1];
  const path = match[2] || '';
  const urls = [];
  for (const gw of PATH_GATEWAYS) urls.push(gw + cid + path);
  for (const gw of SUBDOMAIN_GATEWAYS) urls.push(`https://${cid}.ipfs.${gw}${path}`);
  return urls;
}

/** Fetch JSON from IPFS — races all gateways, returns first success */
async function fetchJsonFromIpfs(ipfsUri) {
  const urls = buildGatewayUrls(ipfsUri);
  console.log('[Wallet] Fetching metadata via', urls.length, 'gateways...');
  try {
    return await Promise.any(
      urls.map(url => fetch(url, { signal: AbortSignal.timeout(8000) }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }))
    );
  } catch {
    console.warn('[Wallet] All metadata gateways failed');
    return null;
  }
}

/** Load image from IPFS — races all gateways, returns first success */
async function loadImageFromIpfs(ipfsUri) {
  const urls = buildGatewayUrls(ipfsUri);
  console.log('[Wallet] Loading image via', urls.length, 'gateways...');
  try {
    return await Promise.any(
      urls.map(url => new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('img load failed'));
        img.src = url;
        setTimeout(() => reject(new Error('Timeout')), 10000);
      }))
    );
  } catch {
    console.warn('[Wallet] All image gateways failed');
    return null;
  }
}

/** 从 tokenURI 获取元数据并提取图片 URL */
async function fetchMetadataImage(uri) {
  const metadata = await fetchJsonFromIpfs(uri);
  if (!metadata || !metadata.image) return null;
  const image = metadata.image;
  if (image.startsWith('ipfs://') || image.startsWith('http')) return image;
  return uri.replace(/\/[^/]+$/, '/') + image;
}

// ========== Token 查找 ==========

async function findFirstOwnedToken(address) {
  try {
    const total = await readTotalSupply();
    const limit = Math.min(total, 500);
    for (let id = total; id >= 1 && (total - id) < limit; id--) {
      try {
        const owner = await readOwnerOf(id);
        if (owner.toLowerCase() === address.toLowerCase()) return BigInt(id);
      } catch { /* skip burned */ }
    }
  } catch (e) { console.warn('[Wallet] findFirstOwnedToken:', e.message); }
  return null;
}

// ========== NFT 检查主流程 ==========

async function checkAndLoadNFT(address) {
  const shortAddr = address.slice(0, 6) + '...' + address.slice(-4);

  try {
    const balance = await readBalanceOf(address);
    console.log('[Wallet] balanceOf:', balance.toString());
    if (balance === 0n) {
      _hasNft = false;
      toast(t('wallet.noNft', { addr: shortAddr }));
      resetPlayerSprite();
      return;
    }

    toast(t('wallet.nftFound', { n: balance.toString() }), true);

    const tokenId = await findFirstOwnedToken(address);
    if (tokenId === null) { toast(t('wallet.nftNotFound')); resetPlayerSprite(); return; }
    console.log('[Wallet] tokenId:', tokenId.toString());

    const uri = await readTokenURI(tokenId);
    console.log('[Wallet] tokenURI:', uri);
    if (!uri) { toast(t('wallet.noMetadata')); resetPlayerSprite(); return; }

    toast(t('wallet.loadMetadata', { id: tokenId.toString() }), true);
    const imageUri = await fetchMetadataImage(uri);
    console.log('[Wallet] imageUri:', imageUri);
    if (!imageUri) { toast(t('wallet.noImageUrl')); resetPlayerSprite(); return; }

    toast(t('wallet.loadImage', { id: tokenId.toString() }), true);
    const img = await loadImageFromIpfs(imageUri);
    if (img) {
      setPlayerSprite(img);
      _hasNft = true;
      toast(t('wallet.imageLoaded', { id: tokenId.toString() }));
    } else {
      _hasNft = false;
      toast(t('wallet.imageFailed'));
      resetPlayerSprite();
    }
  } catch (e) {
    console.error('[Wallet] checkAndLoadNFT:', e);
    toast(t('wallet.error', { msg: e.message }));
    resetPlayerSprite();
  }
}

// ========== 公开 API ==========

export function isConnected() { return connectedAddress !== null; }
export function getConnectedAddress() { return connectedAddress; }
export function onAddressChange(cb) { addressChangeCallback = cb; }
export function hasWallet() { return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'; }
export function hasNft() { return _hasNft; }

/** 链上实时验证当前连接钱包是否持有 NFT */
export async function verifyOwnership() {
  if (!connectedAddress) return false;
  try {
    const balance = await readBalanceOf(connectedAddress);
    _hasNft = balance > 0n;
    return _hasNft;
  } catch (e) {
    console.warn('[Wallet] verifyOwnership failed:', e);
    return false;
  }
}

export async function connectWallet() {
  if (!hasWallet()) return { success: false, error: 'no_wallet' };

  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) return { success: false, error: 'rejected' };

    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log('[Wallet] chainId:', chainId);
    if (chainId !== FILECOIN_CHAIN_ID_HEX) {
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: FILECOIN_CHAIN_ID_HEX }] });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          try { await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [FILECOIN_CHAIN_PARAMS] }); }
          catch { return { success: false, error: 'wrong_chain' }; }
        } else { return { success: false, error: 'wrong_chain' }; }
      }
    }

    connectedAddress = accounts[0];
    setupEventListeners();
    if (addressChangeCallback) addressChangeCallback(connectedAddress);
    checkAndLoadNFT(connectedAddress);
    return { success: true, address: connectedAddress };
  } catch (e) {
    console.error('[Wallet] connectWallet:', e);
    connectedAddress = null;
    return { success: false, error: 'unknown' };
  }
}

export function disconnectWallet() {
  removeEventListeners();
  connectedAddress = null;
  activeRpc = null;
  _hasNft = false;
  resetPlayerSprite();
  if (addressChangeCallback) addressChangeCallback(null);
}

export async function tryRestoreSession() {
  if (!hasWallet()) return;
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (!accounts || accounts.length === 0) return;
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== FILECOIN_CHAIN_ID_HEX) return;
    connectedAddress = accounts[0];
    setupEventListeners();
    if (addressChangeCallback) addressChangeCallback(connectedAddress);
    checkAndLoadNFT(connectedAddress);
  } catch (e) { console.warn('[Wallet] restore failed:', e.message); }
}

// ========== 事件监听 ==========

let _accountsHandler = null;
let _chainHandler = null;

function setupEventListeners() {
  removeEventListeners();
  _accountsHandler = async (accounts) => {
    if (!accounts || accounts.length === 0) { disconnectWallet(); }
    else if (accounts[0].toLowerCase() !== connectedAddress?.toLowerCase()) {
      connectedAddress = accounts[0]; activeRpc = null;
      if (addressChangeCallback) addressChangeCallback(connectedAddress);
      checkAndLoadNFT(connectedAddress);
    }
  };
  _chainHandler = (chainId) => { if (chainId !== FILECOIN_CHAIN_ID_HEX) disconnectWallet(); };
  window.ethereum.on('accountsChanged', _accountsHandler);
  window.ethereum.on('chainChanged', _chainHandler);
}

function removeEventListeners() {
  if (!window.ethereum) return;
  if (_accountsHandler) window.ethereum.removeListener('accountsChanged', _accountsHandler);
  if (_chainHandler) window.ethereum.removeListener('chainChanged', _chainHandler);
  _accountsHandler = null;
  _chainHandler = null;
}
