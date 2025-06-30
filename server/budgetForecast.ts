import prisma from './prisma';
import { Prisma } from '@prisma/client';
export async function forecastBudget(organizationId: string, city: string, startDate: string, endDate: string, travelers: number): Promise<{
    dailyAverage: number;
    predictedTotal: number;
    dataPoints: number;
}> {
    const pastTrips = await prisma.trip.findMany({
        where: {
            organizationId,
            city,
            budget: { not: null },
            startDate: { not: null },
            endDate: { not: null },
        },
        select: {
            budget: true,
            startDate: true,
            endDate: true,
        },
        take: 20,
    });

    const dailyCosts = pastTrips
        .map(t => {
            const duration = Math.ceil((t.endDate!.getTime() - t.startDate!.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return t.budget!.toNumber() / duration;
        })
        .filter(cost => cost > 0);
    const dailyAverage = dailyCosts.length > 0
        ? Math.round(dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length)
        : 15000; // default $150/day in cents
    const durationDays = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
    const predictedTotal = dailyAverage * durationDays * travelers;
    return { dailyAverage, predictedTotal, dataPoints: dailyCosts.length };
}
