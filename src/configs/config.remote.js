export default {
  provider: 'ws://158.247.223.174:8545',
  orchestrator: '0x9bE3c853886Ab548be2b4aFcC139399c7996eb2b',
  explorer: 'https://etherscan.io',
  indexServer: 'http://localhost:3000',
  swapUrl: 'http://localhost:3000',
  stakingPools: [
    {
      symbol: 'HUSD/DOL',
      pairAddress: '0x9DAe9f9B1B5F53BFcCbD1Cc2f6003a2d3E4433aF',
    },
    {
      symbol: 'HUSD/RDS',
      pairAddress: '0x77787c5DF71a34ABBA4531127F2497880ACb3566',
    },
  ],
}
