// components/charts/chartRegistry.tsx
import DynamicLineChart from "./DynamicLineChart";
import DynamicBarChart from "./DynamicBarChart";
import DynamicPieChart from "./DynamicPieChart";
import DynamicProgressBar from "./DynamicProgressBar";
import DynamicProgressCircle from "./DynamicProgressCircle";
import DynamicTrackerChart from "./DynamicTrackerChart";
// ... import other chart components if any

export const chartComponents: Record<
  string,
  React.FC<{ keyName: string; chartData: any[] }>
> = {
  Line: DynamicLineChart,
  Bar: DynamicBarChart,
  Pie: DynamicPieChart,
  ProgressBar: DynamicProgressBar,
  ProgressCircle: DynamicProgressCircle,
  Tracker: DynamicTrackerChart,
};
