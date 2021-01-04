export function isInstalled() {
  return !!window.ethereum
}

export function isConnected() {
  return window.ethereum.isConnected()
}

export function connect() {
  return window.ethereum.request({ method: 'eth_requestAccounts' })
}

export function getDefaultAccount() {
  return window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
    return accounts[0]
  })
}

export function getChainId() {
  return window.ethereum.chainId
}
