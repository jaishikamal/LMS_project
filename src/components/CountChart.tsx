"use client";
import Image from "next/image";
import {
  RadialBarChart,
  RadialBar,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CountChart = ({ boys, girls }: { boys: number; girls: number }) => {
  const total = boys + girls;
  const boysPercent = total > 0 ? Math.round((boys / total) * 100) : 0;
  const girlsPercent = total > 0 ? Math.round((girls / total) * 100) : 0;

  const data = [
    {
      name: "Total",
      count: total,
      fill: "white",
    },
    {
      name: "Girls",
      count: girls,
      fill: "#FAE27C",
    },
    {
      name: "Boys",
      count: boys,
      fill: "#C3EBFA",
    },
  ];

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      {/* TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Students</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      {/* CHART */}
      <div className="relative w-full h-[75%]">
        <ResponsiveContainer>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="100%"
            barSize={32}
            data={data}
          >
            <RadialBar background dataKey="count" />
          </RadialBarChart>
        </ResponsiveContainer>
        <Image
          src="/maleFemale.png"
          alt=""
          width={50}
          height={50}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />
      </div>
      {/* BOTTOM */}
      <div className="flex justify-center gap-16">
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-kamal-sky rounded-full" />
          <h1 className="font-bold">{boys.toLocaleString()}</h1>
          <h2 className="text-xs text-gray-300">Boys ({boysPercent}%)</h2>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-kamal-yellow rounded-full" />
          <h1 className="font-bold">{girls.toLocaleString()}</h1>
          <h2 className="text-xs text-gray-300">Girls ({girlsPercent}%)</h2>
        </div>
      </div>
    </div>
  );
};

export default CountChart;
