import React from "react";

interface AudioWavesProps {
  audioData: number[];
}

const AudioWaves: React.FC<AudioWavesProps> = ({ audioData }) => {
  return (
    <div className="h-16 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
      <div className="flex h-full items-end justify-center">
        {audioData.map((value, index) => (
          <div
            key={index}
            className="mx-[1px] w-1 bg-blue-500 dark:bg-blue-400"
            style={{
              height: `${(value / 255) * 100}%`,
              transition: "height 0.05s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AudioWaves;
