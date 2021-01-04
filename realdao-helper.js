const FIXED_POINT = 1e18
const PRICE_POINT = 1e8
const DOL_POINT = 1e8
const RDS_POINT = 1e8
const INITIAL_REWARD = 4
const BLOCKS_PER_YEAR = 2102400
const INITIAL_SUPPLY = 4200000

export class RealDAOHelper extends RealDAO {
  constructor(options) {
    const realDAOOptions = {
      Web3: options.Web3,
      networks: RealDAO.Networks[options.env],
      provider: options.config.provider,
      supremeAddress: options.config.supremeAddress,
    }
    super(realDAOOptions)
    this.options = options
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
    let total = 0
    let rewardPerBlock = INITIAL_REWARD
    while (start + BLOCKS_PER_YEAR <= end) {
      total += rewardPerBlock * BLOCKS_PER_YEAR
      start += BLOCKS_PER_YEAR
      rewardPerBlock /= 2
    }
    total += (end - start) * INITIAL_REWARD
    return total
  }
}
