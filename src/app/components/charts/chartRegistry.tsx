// components/charts/chartRegistry.tsx
import DynamicLineChart from "./DynamicLineChart";
import DynamicBarChart from "./DynamicBarChart";
import DynamicPieChart from "./DynamicPieChart";

export const chartComponents: Record<
  string,
  React.FC<{ keyName: string; chartData: any[] }>
> = {
  Line: DynamicLineChart,
  Bar: DynamicBarChart,
  Pie: DynamicPieChart,
  // Future chart types can be added here
};
