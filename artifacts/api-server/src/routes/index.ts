import { Router, type IRouter } from "express";
import healthRouter from "./health";
import expensesRouter from "./expenses";
import recurringExpensesRouter from "./recurring-expenses";
import budgetsRouter from "./budgets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(expensesRouter);
router.use(recurringExpensesRouter);
router.use(budgetsRouter);

export default router;
