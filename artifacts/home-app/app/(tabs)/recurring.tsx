import { Redirect } from "expo-router";

export default function RecurringScreen() {
  return <Redirect href={{ pathname: "/", params: { tab: "Recurring" } }} />;
}
