import dotenv from 'dotenv';
import fs from 'fs/promises';
import { db } from '../db/db.js';
import { trips, activities, expenses } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { GaussianNB } from 'ml-naivebayes';
import MLR from 'ml-regression-multivariate-linear';
dotenv.config();
function encode(map: Map<string, number>, key: string): number {
    if (!map.has(key)) {
        map.set(key, map.size);
    }
    return map.get(key)!;
}
async function trainRecommendationModel() {
    const rows = await db
        .select({
        userId: trips.userId,
        city: trips.city,
        tag: activities.tag,
    })
        .from(activities)
        .innerJoin(trips, eq(activities.tripId, trips.id));
    const userMap = new Map<string, number>();
    const cityMap = new Map<string, number>();
    const tagMap = new Map<string, number>();
    const X: number[][] = [];
    const y: number[] = [];
    for (const row of rows) {
        if (!row.tag || !row.userId)
            continue;
        const u = encode(userMap, row.userId);
        const c = encode(cityMap, row.city || 'unknown');
        const t = encode(tagMap, row.tag);
        X.push([u, c]);
        y.push(t);
    }
    if (X.length === 0) {
        console.log('No training data found for recommendation model.');
        return;
    }
    const nb = new GaussianNB();
    nb.train(X, y);
    await fs.mkdir('data/models', { recursive: true });
    await fs.writeFile('data/models/recommendation-model.json', JSON.stringify({
        model: nb.toJSON(),
        userMap: Array.from(userMap.entries()),
        cityMap: Array.from(cityMap.entries()),
        tagMap: Array.from(tagMap.entries()),
    }, null, 2));
    console.log(`Recommendation model trained with ${X.length} samples.`);
}
async function trainSpendForecastModel() {
    const rows = await db
        .select({
        tripId: trips.id,
        budget: trips.budget,
        startDate: trips.startDate,
        endDate: trips.endDate,
        totalExpense: sql<number> `COALESCE(sum(${expenses.amount}), 0)`,
    })
        .from(trips)
        .leftJoin(expenses, eq(trips.id, expenses.tripId))
        .groupBy(trips.id);
    const X: number[][] = [];
    const y: number[][] = [];
    for (const row of rows) {
        if (!row.startDate || !row.endDate)
            continue;
        const duration = (row.endDate.getTime() - row.startDate.getTime()) / (1000 * 60 * 60 * 24) +
            1;
        const budget = row.budget || 0;
        const expense = row.totalExpense || 0;
        X.push([duration, budget]);
        y.push([expense]);
    }
    if (X.length === 0) {
        console.log('No training data for spend forecasting.');
        return;
    }
    const mlr = new MLR(X, y);
    await fs.mkdir('data/models', { recursive: true });
    await fs.writeFile('data/models/spend-forecast-model.json', JSON.stringify({ model: mlr.toJSON() }, null, 2));
    console.log(`Spend forecast model trained with ${X.length} samples.`);
}
async function main() {
    await trainRecommendationModel();
    await trainSpendForecastModel();
}
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
export { trainRecommendationModel, trainSpendForecastModel };
