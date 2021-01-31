export default {
  provider: 'https://http-mainnet-node1.hecochain.com',
  orchestrator: '0x64037059072c9CDB5B1de633a5657CD55f489d0C',
  explorer: 'https://scan.hecochain.com',
  indexServer: 'http://realdao.finance:3000',
  swapUrl: 'https://ht.mdex.com',
  rdsPair: {
    address: '0xdde0d948b0597f08878620f1afd3070dc7243386',
    decimalsDiff: 10,
  },
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
