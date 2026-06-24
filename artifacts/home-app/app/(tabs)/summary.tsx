import { Redirect } from "expo-router";

export default function SummaryScreen() {
  return <Redirect href={{ pathname: "/", params: { tab: "Summary" } }} />;
}
