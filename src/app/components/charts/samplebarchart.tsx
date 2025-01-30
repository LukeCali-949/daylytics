"use client"

import React from "react"

import { BarChart } from "../extra/tremor/BarChartStuff";
import { Title } from "@tremor/react";

const chartdata = [
  {
    name: "Amphibians",
    "Number of threatened species": 2488,
  },
  {
    name: "Birds",
    "Number of threatened species": 1445,
  },
  {
    name: "Crustaceans",
    "Number of threatened species": 743,
  },
  {
    name: "Ferns",
    "Number of threatened species": 281,
  },
  {
    name: "Arachnids",
    "Number of threatened species": 251,
  },
  {
    name: "Corals",
    "Number of threatened species": 232,
  },
  {
    name: "Algae",
    "Number of threatened species": 98,
  },
]

export const BarChartOnValueChangeExample = () => {
    const [value, setValue] = React.useState<any>(null)
    return (
      <div className="w-full h-full flex flex-col">
        <Title className="text-l font-semibold mb-2 px-2">
          {"hours worked"}
        </Title>
        <div className="flex-1 relative">
          <BarChart
            className="h-full w-full"
            data={chartdata}
            index="name"
            categories={["Number of threatened species"]}
            yAxisWidth={45}
            onValueChange={(v) => setValue(v)}
          />
        </div>
      </div>
    )
  }