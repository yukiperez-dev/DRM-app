import { Router, type IRouter } from "express";
import healthRouter from "./health";
import expensesRouter from "./expenses";
import recurringExpensesRouter from "./recurring-expenses";
import budgetsRouter from "./budgets";
import checklistRouter from "./checklist";

const router: IRouter = Router();

router.use(healthRouter);
router.use(expensesRouter);
router.use(recurringExpensesRouter);
router.use(budgetsRouter);
router.use(checklistRouter);

export default router;
