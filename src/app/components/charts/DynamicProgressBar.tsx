import { ProgressBar } from "../extra/tremor/ProgressBarStuff";

export const ProgressBarExample = () => {
  return (
    <div className="mb-6 w-[400px] rounded-lg border-2 border-gray-500 bg-[#131313] p-5 shadow-2xl">
      <h4 className="mb-2 text-center font-semibold">Hours worked</h4>
      <ProgressBar value={72} showAnimation={true} max={200} />
    </div>
  );
};
