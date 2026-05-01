import { Router } from "express";
import { db, settlementsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/settlements", async (_req, res) => {
  try {
    const settlements = await db
      .select()
      .from(settlementsTable)
      .orderBy(settlementsTable.createdAt);
    res.json(settlements);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settlements" });
  }
});

router.post("/settlements", async (req, res) => {
  try {
    const body = req.body;
    const [settlement] = await db
      .insert(settlementsTable)
      .values({
        id: body.id,
        fromPerson: body.fromPerson,
        toPerson: body.toPerson,
        amount: String(body.amount),
        currency: body.currency,
        date: body.date,
        note: body.note ?? null,
      })
      .returning();
    res.status(201).json(settlement);
  } catch (err) {
    res.status(500).json({ error: "Failed to create settlement" });
  }
});

router.delete("/settlements/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(settlementsTable).where(eq(settlementsTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete settlement" });
  }
});

export default router;
