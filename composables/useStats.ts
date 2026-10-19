import type { Coffee, Tasting } from '~/types'

export const useStats = () => {
  const computeStats = (coffees: Coffee[], tastings: Tasting[]) => {
    const totalCoffees = coffees.length
    const totalTastings = tastings.length
    const favorites = tastings.filter(t => t.isFavorite).length
    const wouldBuyAgain = tastings.filter(t => t.wouldBuyAgain).length

    const avgRating = totalTastings
      ? +(tastings.reduce((sum, t) => sum + t.ratingOverall, 0) / totalTastings).toFixed(1)
      : 0

    // Varieties breakdown
    const varietyCounts = coffees.reduce((acc, c) => {
      for (const v of coffeeVarieties(c)) acc[v] = (acc[v] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topVarieties = Object.entries(varietyCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    // Process breakdown
    const processCounts = coffees.reduce((acc, c) => {
      acc[c.process] = (acc[c.process] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topProcesses = Object.entries(processCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }))

    // Brew method breakdown
    const brewMethodCounts = tastings.reduce((acc, t) => {
      acc[t.brewMethod] = (acc[t.brewMethod] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topBrewMethods = Object.entries(brewMethodCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    // Region breakdown
    const regionCounts = coffees.reduce((acc, c) => {
      acc[c.originRegion] = (acc[c.originRegion] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topRegions = Object.entries(regionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    return {
      totalCoffees,
      totalTastings,
      favorites,
      wouldBuyAgain,
      avgRating,
      topVarieties,
      topProcesses,
      topBrewMethods,
      topRegions,
    }
  }

  return { computeStats }
}
