"use client";
import Image from "next/image";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type SubjectPerformance = {
  subject: string;
  average: number;
};

const SubjectPerformanceChart = ({
  data,
}: {
  data: SubjectPerformance[];
}) => {
  return (
    <div className="bg-white rounded-lg p-4 h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Subject Performance</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart width={500} height={300} data={data} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddd" />
          <XAxis
            dataKey="subject"
            axisLine={false}
            tick={{ fill: "#d1d5db", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "#f1f0ff" }}
            contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
          />
          <Bar
            dataKey="average"
            name="Avg score"
            fill="#CFCEFF"
            radius={[10, 10, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SubjectPerformanceChart;
