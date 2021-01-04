export default {
  networks: {
    dev: {
      provider: 'ws://localhost:8545',
      chainId: '0x539',
      supremeAddress: '0x9Ea0eD636d2c33AA45C8aEf7fbA20F05c7236d54',
      etherscan: 'etherscan.io',
      indexServer: 'http://localhost:3000',
    },
    test: {
      provider: 'ws://139.180.193.123:8545',
      chainId: '0x539',
      supremeAddress: '0x1d736CBAB67422a524E6923A2e4f47C2Ae891335',
      etherscan: 'etherscan.io',
      indexServer: 'http://139.180.193.123:3000',
    },
    kovan: {
      provider: 'https://kovan.infura.io/v3/d3f8f9c2141b4561b6c7f23a34466d7c',
      chainId: '42',
      supremeAddress: '0x297344B27D52abAe0f30AFE947ddAd60d425F40d',
      etherscan: 'kovan.etherscan.io',
      indexServer: 'http://localhost:3000',
    },
    ropsten: {
      provider: 'https://ropsten.infura.io/v3/d3f8f9c2141b4561b6c7f23a34466d7c',
      chainId: '3',
      supremeAddress: '0x297344B27D52abAe0f30AFE947ddAd60d425F40d',
      etherscan: 'ropsten.etherscan.io',
      indexServer: 'http://localhost:3000',
    },
    live: {
      provider: 'ws://localhost:8545',
      chainId: '1',
      supremeAddress: '0x297344B27D52abAe0f30AFE947ddAd60d425F40d',
      etherscan: 'etherscan.io',
      indexServer: 'http://localhost:3000',
    },
  },
}
