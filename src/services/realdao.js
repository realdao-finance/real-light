const FIXED_POINT = 1e18
const LP_TOKEN_POINT = 1e18
const PRICE_POINT = 1e8
const DOL_POINT = 1e8
const RDS_POINT = 1e8
const BLOCKS_PER_YEAR = 2102400 * 5
const INITIAL_SUPPLY = 2e7
const INITIAL_REWARD = 8e7 / 2 / BLOCKS_PER_YEAR
const MAX_UINT256 = '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'

export default class RealDAOService extends RealDAO {
  constructor(options) {
    const configEnv = options.config.env
    const env = configEnv === 'remote' ? 'dev' : configEnv
    const realDAOOptions = {
      Web3,
      env,
      provider: options.config.provider,
      orchestrator: options.config.orchestrator,
    }
    super(realDAOOptions)
    this.config = options.config
    this.options = options

    this._lastRDSPrice = 1
    this._lpPairs = {}
  }

  async initialize() {
    const refreshInterval = 10000
    if (this.config.rdsPair) {
      const fetchRDSPrice = this._fetchRDSPrice.bind(this)
      fetchRDSPrice()
      setInterval(fetchRDSPrice, refreshInterval)
    }
    if (this.config.env === 'mainnet') {
      for (const pool of this.config.stakingPools) {
        const stableSymbol = pool.symbol.split('/')[0]
        const pairAddress = pool.pairAddress
        const fetchLPPairInfo = this._fetchLPPairInfo.bind(this, pairAddress, stableSymbol)
        fetchLPPairInfo()
        setInterval(fetchLPPairInfo, refreshInterval)
      }
    }
  }

  async getOverview() {
    await this.loadReporter()
    await this.loadRDS()
    await this.loadDOL()
    await this.loadDistributor()

    const reporter = this.reporter()
    const rds = this.rds()
    const dol = this.dol()
    const distributor = this.distributor()
    const results = await Promise.all([
      reporter.getAllMarketInfo().call(),
      reporter.getUnderlyingPrices().call(),
      rds.totalSupply().call(),
      dol.totalSupply().call(),
      distributor.mineStartBlock().call(),
      this._web3.eth.getBlock('latest'),
    ])

    const marketInfo = results[0]
    const prices = results[1]
    const rdsSupply = results[2]
    const dolSupply = results[3]
    const mineStartBlockNum = Number(results[4])
    const latestBlockNum = results[5].number

    const rdsMined = this._calculateTotalMined(mineStartBlockNum, latestBlockNum)
    const priceMap = new Map()
    for (const price of prices) {
      priceMap.set(price.rToken, price.underlyingPrice)
    }

    const rdsSupplyLiteral = Number(rdsSupply) / RDS_POINT
    const dolSupplyLiteral = Number(dolSupply) / DOL_POINT

    let totalSupplyAcc = 0
    let totalBorrowsAcc = 0
    let totalReservesAcc = 0
    let markets = []
    for (const item of marketInfo) {
      const { totalSupply, totalBorrows, totalReserves, exchangeRateCurrent, rToken } = item
      const price = Number(priceMap.get(rToken))
      totalSupplyAcc += (Number(totalSupply) * Number(exchangeRateCurrent) * price) / FIXED_POINT
      totalReservesAcc += Number(totalReserves) * price
      totalBorrowsAcc += Number(totalBorrows) * price

      markets.push(this._transformMarketInfo(item))
    }
    const totalSupplyAccLiteral = totalSupplyAcc / FIXED_POINT / PRICE_POINT - dolSupplyLiteral
    const totalReservesAccLiteral = totalReservesAcc / FIXED_POINT / PRICE_POINT
    const totalBorrowsAccLiteral = totalBorrowsAcc / FIXED_POINT / PRICE_POINT
    return {
      totalSupplyAccLiteral,
      totalReservesAccLiteral,
      totalBorrowsAccLiteral,
      markets,
      rds: {
        circulating: rdsSupplyLiteral,
        mined: rdsMined,
      },
      dol: {
        totalSupply: dolSupplyLiteral,
      },
    }
  }

  async getDistributorAddress() {
    await this.loadDistributor()
    return this.distributor(true).options.address
  }

  async needApprove(underlyingAddr, spender, account) {
    const contract = this.erc20Token(underlyingAddr)
    const allowance = await contract.allowance(account, spender).call()
    return BigInt(allowance) < BigInt(Number.MAX_SAFE_INTEGER)
  }

  async approve(underlyingAddr, spender, owner) {
    const contract = this.erc20Token(underlyingAddr)
    await contract.approve(spender, MAX_UINT256).send({ from: owner })
  }

  async getRTokenBalances(rToken, account) {
    await this.loadReporter()

    const reporter = this.reporter()
    const result = await reporter.getRTokenBalances(rToken, account).call()
    return this._transformRTokenBalances(result)
  }

  async getAccountBalances(account) {
    await this.loadReporter()
    await this.loadRDS()

    const reporter = this.reporter()
    const rds = this.rds()
    const results = await Promise.all([rds.balanceOf(account).call(), reporter.getAllRTokenBalances(account).call()])
    const sheets = results[1].map(this._transformRTokenBalances.bind(this))
    const rdsBalanceLiteral = Number(results[0]) / RDS_POINT
    return {
      sheets,
      rds: {
        balance: results[0],
        balanceLiteral: rdsBalanceLiteral,
      },
    }
  }

  async getPools(account) {
    await this.loadDistributor()
    await this.loadReporter()
    await this.loadRTokens()
    await this.loadDOL()
    await this.loadRDS()

    const distributor = this.distributor()
    const reporter = this.reporter()
    const querys = [
      this._web3.eth.getBlock('latest'),
      reporter.getUnderlyingPrices().call(),
      distributor.rewardsPerBlock().call(),
      distributor.getAllPools().call(),
    ]
    if (account) {
      querys.push(distributor.getAccountRecords(account).call())
    }

    const results = await Promise.all(querys)
    const rdsPrice = this._lastRDSPrice * ((PRICE_POINT / RDS_POINT) * FIXED_POINT)
    const latestBlockNum = Number(results[0].number)

    const priceMap = new Map()
    for (const price of results[1]) {
      priceMap.set(price.rToken, Number(price.underlyingPrice))
    }
    const rewardsPerBlock = Number(results[2])

    const lendingPoolTitles = ['DOL', 'HBTC', 'HETH', 'WHT']
    const exchangingPoolTitles = this.config.stakingPools.map((p) => p.symbol)
    const lpUrls = []
    for (const poolConfig of this.config.stakingPools) {
      let addressesSuffix = ''
      const pairInfo = this._lpPairs[poolConfig.pairAddress]
      if (pairInfo) {
        addressesSuffix = `/${pairInfo.address0}/${pairInfo.address1}`
      }
      const url = `${this.config.swapUrl}/#/add${addressesSuffix}`
      lpUrls.push(url)
    }

    const pools = []
    const totalPools = results[3].length
    for (const item of results[3]) {
      const pool = Object.assign({}, item)
      pool.state = Number(pool.state)
      pool.ptype = Number(pool.ptype)
      pool.totalPowerCorrect = Number(item.totalPower) + Number(item.accumulatedPower)
      const ptype = pool.ptype
      if (ptype === 1) {
        // POOL_TYPE_LENDING
        const price = priceMap.get(item.tokenAddr)
        pool.totalPowerNormalized = (pool.totalPowerCorrect * price) / FIXED_POINT
        pool.underlyingPrice = price
        pool.title = lendingPoolTitles.shift()
      } else {
        // POOL_TYPE_EXCHANGING
        const lpPrice = this._lpPairs[pool.tokenAddr] ? this._lpPairs[pool.tokenAddr].lpPrice : 100000000
        pool.totalPowerNormalized = (pool.totalPowerCorrect * lpPrice) / LP_TOKEN_POINT
        pool.underlyingPrice = lpPrice
        pool.title = exchangingPoolTitles.shift()
        pool.lpUrl = lpUrls.shift()
      }
      const state = pool.state
      if (state === 0) {
        // POOL_STATUS_NOT_START
        pool.countdown = Number(item.startBlock - latestBlockNum)
      }
      if (state === 1) {
        // POOL_STATUS_ACTIVE
        pool.apy = (rewardsPerBlock * BLOCKS_PER_YEAR * rdsPrice) / FIXED_POINT / pool.totalPowerNormalized
      } else {
        pool.apy = 0
      }
      pool.totalPowerNormalizedLiteral = pool.totalPowerNormalized / PRICE_POINT

      if (pool.totalPowerCorrect > 0) {
        const newMined = this._calculateMined(Number(pool.lastBlockNumber), latestBlockNum) / totalPools
        const totalMined = newMined * RDS_POINT + Number(pool.accumulatedTokens)
        pool.rewardIndex = Number(pool.rewardIndex) + (totalMined * FIXED_POINT) / pool.totalPowerCorrect
      }
      if (pool.title) {
        pools.push(pool)
      }
    }
    const my = []
    if (account) {
      const accountRecords = results[4]
      for (let i = 0; i < accountRecords.length; i++) {
        if (!pools[i]) break
        const item = Object.assign({}, accountRecords[i])
        const rewardIndex = Number(pools[i].rewardIndex)
        const power = Number(item.power)
        const mask = Number(item.mask)
        const settled = Number(item.settled)
        item.unclaimed = (rewardIndex * power - mask) / FIXED_POINT + settled
        item.unclaimedLiteral = item.unclaimed / RDS_POINT
        item.claimedLiteral = Number(item.claimed) / RDS_POINT
        item.powerNormalized = (item.power * pools[i].underlyingPrice) / FIXED_POINT
        item.powerNormalizedLiteral = item.powerNormalized / PRICE_POINT
        item.powerRatio = pools[i].totalPowerCorrect > 0 ? item.power / pools[i].totalPowerCorrect : 0
        my.push(item)
      }
    }
    return { pools, my }
  }

  async getDistributorStats() {
    await this.loadDistributor()

    const distributor = this.distributor()
    const result = await distributor.getDistributorStats().call()
    const stats = Object.assign({}, result)
    stats.rewardsPerBlockLiteral = Number(stats.rewardsPerBlock) / RDS_POINT
    return stats
  }

  async getPrice(symbol) {
    const prices = await this.getPrices()
    for (const item of prices) {
      if (item.anchorSymbol === symbol) {
        return item
      }
    }
    return null
  }

  async getPrices() {
    await this.loadReporter()

    const reporter = this.reporter()
    const prices = await reporter.getUnderlyingPrices().call()
    return prices
      .filter((item) => item.anchorSymbol !== 'USD')
      .map((item) => {
        const underlyingPriceLiteral = Number(item.underlyingPrice) / 1e8
        return Object.assign({}, item, { underlyingPriceLiteral })
      })
  }

  async getAccountLiquidity(account) {
    await this.loadController()

    const controller = this.controller()
    const result = await controller.getAccountLiquidity(account).call()
    const liquidity = Number(result[0])
    const shortfall = Number(result[1])
    const liquidityLiteral = liquidity / PRICE_POINT
    const shortfallLiteral = liquidity / PRICE_POINT
    return {
      liquidity,
      shortfall,
      liquidityLiteral,
      shortfallLiteral,
    }
  }

  encodeParameters(signature, values) {
    if (values.length === 0) {
      return '0x'
    }
    let parameterStartPos = 0
    let parameterEndPos = 0
    for (let i = 0; i < signature.length; i++) {
      if (signature[i] === '(') {
        parameterStartPos = i
      }
      if (signature[i] === ')') {
        parameterEndPos = i
      }
    }
    const typeSlice = signature.slice(parameterStartPos + 1, parameterEndPos)
    if (values.length === 1) {
      const type = typeSlice
      return this._web3.eth.abi.encodeParameter(type, values[0])
    } else {
      const typesArray = typeSlice.split(',')
      return this._web3.eth.abi.encodeParameters(typesArray, values)
    }
  }

  async getMaxRepay(underlyingSymbol, borrowerAddress) {
    const closeFactor = 0.5
    const rToken = this.rToken(underlyingSymbol)
    const borrowBalance = await rToken.borrowBalanceCurrent(borrowerAddress).call()
    const decimals = Number(this._marketInfo[underlyingSymbol].underlyingDecimals)
    return (Number(borrowBalance) * closeFactor) / Math.pow(10, decimals)
  }

  async calculateSeizeTokens(repaySymbol, collateralSymbol, liquidateAmount) {
    await this.loadController()

    const controller = this.controller()
    const repayToken = this._marketInfo[repaySymbol].rToken
    const collateralToken = this._marketInfo[collateralSymbol].rToken
    const result = await controller.liquidateCalculateSeizeTokens(repayToken, collateralToken, liquidateAmount).call()
    return Number(result) / Math.pow(10, 8)
  }

  // Private methods

  _transformRTokenBalances(obj) {
    const result = Object.assign({}, obj)
    const decimalDenom = Math.pow(10, Number(obj.underlyingDecimals))
    result.tokenBalanceLiteral = Number(obj.tokenBalance) / decimalDenom
    result.collateralBalanceLiteral = Number(obj.balanceOfUnderlying) / decimalDenom
    result.borrowBalanceLiteral = Number(obj.borrowBalanceCurrent) / decimalDenom
    result.rTokenBalanceLiteral = Number(obj.balanceOf) / 1e8
    result.underlyingDecimals = Number(obj.underlyingDecimals)
    return result
  }

  _transformMarketInfo(item) {
    const market = Object.assign({}, item)
    const {
      underlyingDecimals,
      totalSupply,
      exchangeRateCurrent,
      totalReserves,
      totalBorrows,
      borrowRatePerBlock,
      supplyRatePerBlock,
      totalCash,
      collateralFactorMantissa,
      reserveFactorMantissa,
      rTokenDecimals,
    } = item
    const decimalDenom = Math.pow(10, Number(underlyingDecimals))

    market.totalReservesLiteral = Number(totalReserves) / decimalDenom
    market.totalBorrowsLiteral = Number(totalBorrows) / decimalDenom
    if (item.symbol === 'rDOL') {
      market.totalSupplyLiteral = Number(totalSupply) / FIXED_POINT / decimalDenom
    } else {
      market.totalSupplyLiteral = (Number(totalSupply) * Number(exchangeRateCurrent)) / FIXED_POINT / decimalDenom
    }
    market.borrowRatePerYear = (Number(borrowRatePerBlock) * BLOCKS_PER_YEAR) / FIXED_POINT
    market.supplyRatePerYear = (Number(supplyRatePerBlock) * BLOCKS_PER_YEAR) / FIXED_POINT
    market.totalCashLiteral = Number(totalCash) / Math.pow(10, underlyingDecimals)
    market.collateralFactorLiteral = Number(collateralFactorMantissa) / FIXED_POINT
    market.reserveFactorLiteral = Number(reserveFactorMantissa) / FIXED_POINT

    const decimalsDiff = Number(underlyingDecimals) - Number(rTokenDecimals)
    market.exchangeRateLiteral = Number(exchangeRateCurrent) / FIXED_POINT / Math.pow(10, decimalsDiff)
    market.liquidationIncentiveLiteral = 0.08

    return market
  }

  _calculateTotalMined(start, end) {
    return this._calculateMined(start, end) + INITIAL_SUPPLY
  }

  _calculateMined(start, end) {
    if (start === 0) return 0
    let total = 0
    let rewardPerBlock = INITIAL_REWARD
    while (start + BLOCKS_PER_YEAR <= end) {
      total += rewardPerBlock * BLOCKS_PER_YEAR
      start += BLOCKS_PER_YEAR
      rewardPerBlock /= 2
    }
    total += (end - start) * INITIAL_REWARD
    return Math.floor(total)
  }

  async _fetchRDSPrice() {
    const uniswapPair = this.uniswapPairView(this.config.rdsPair.address)
    const reserves = await uniswapPair.getReserves().call()
    const price = (Number(reserves[0]) * 10 ** this.config.rdsPair.decimalsDiff) / Number(reserves[1])
    this._lastRDSPrice = Number(price.toFixed(3))
  }

  async _fetchLPPairInfo(pairAddress, stableSymbol) {
    const uniswapPair = this.uniswapPairView(pairAddress)
    if (!this._lpPairs[pairAddress]) {
      const addresses = await Promise.all([uniswapPair.token0().call(), uniswapPair.token1().call()])
      const token0 = this.erc20Token(addresses[0])
      const symbol0 = await token0.symbol().call()
      const stablePosition = symbol0 === stableSymbol ? 0 : 1
      const address0 = addresses[stablePosition]
      const address1 = addresses[1 - stablePosition]
      const decimals = await this.erc20Token(address0).decimals().call()
      this._lpPairs[pairAddress] = {
        address0,
        address1,
        stablePosition,
        stableDecimals: Number(decimals),
      }
    }
    const results = await Promise.all([uniswapPair.totalSupply().call(), uniswapPair.getReserves().call()])
    const pairInfo = this._lpPairs[pairAddress]
    pairInfo.totalSupply = Number(results[0])
    if (pairInfo.stablePosition === 0) {
      pairInfo.stableReserves = Number(results[1][0])
    } else {
      pairInfo.stableReserves = Number(results[1][1])
    }
    const decimalsDiff = 18 - pairInfo.stableDecimals
    pairInfo.lpPrice = ((pairInfo.stableReserves * 10 ** decimalsDiff) / pairInfo.totalSupply) * 2 * PRICE_POINT
    logger.debug('fetchLPPairInfo:', pairAddress, stableSymbol, pairInfo)
  }
}
