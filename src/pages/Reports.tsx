import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { inventoryData, getStockStatus, formatPrice } from '@/data/inventory';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS = ['hsl(245, 58%, 60%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)'];

export default function Reports() {
  const stockByGrade = useMemo(() => {
    const gradeA = inventoryData.filter((i) => i.grade === 'A').reduce((s, i) => s + i.quantity, 0);
    const gradeB = inventoryData.filter((i) => i.grade === 'B').reduce((s, i) => s + i.quantity, 0);
    const gradeC = inventoryData.filter((i) => i.grade === 'C').reduce((s, i) => s + i.quantity, 0);
    return [
      { name: 'Grade A', value: gradeA },
      { name: 'Grade B', value: gradeB },
      { name: 'Grade C', value: gradeC },
    ].filter((d) => d.value > 0);
  }, []);

  const stockByStatus = useMemo(() => {
    const inStock = inventoryData.filter((i) => getStockStatus(i.quantity) === 'in-stock').length;
    const lowStock = inventoryData.filter((i) => getStockStatus(i.quantity) === 'low-stock').length;
    const critical = inventoryData.filter((i) => getStockStatus(i.quantity) === 'critical').length;
    return [
      { name: 'In Stock', value: inStock },
      { name: 'Low Stock', value: lowStock },
      { name: 'Critical', value: critical },
    ];
  }, []);

  const valueByDevice = useMemo(() => {
    return inventoryData
      .map((item) => ({
        name: item.deviceName.split(' ').slice(0, 2).join(' '),
        value: item.quantity * item.pricePerUnit,
        units: item.quantity,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, []);

  const trendData = [
    { month: 'Aug', units: 58, value: 18500 },
    { month: 'Sep', units: 72, value: 22400 },
    { month: 'Oct', units: 65, value: 20100 },
    { month: 'Nov', units: 89, value: 27800 },
    { month: 'Dec', units: 76, value: 24200 },
    { month: 'Jan', units: 82, value: 26350 },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Analytics and insights for your inventory
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Trend */}
        <div className="bg-card rounded-lg border border-border shadow-soft p-6 lg:col-span-2">
          <h3 className="font-semibold text-foreground mb-4">Stock & Value Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="units"
                  stroke="hsl(245, 58%, 60%)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Units"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Value ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Value by Device */}
        <div className="bg-card rounded-lg border border-border shadow-soft p-6">
          <h3 className="font-semibold text-foreground mb-4">Value by Device</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valueByDevice} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                <Tooltip
                  formatter={(value: number) => formatPrice(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" fill="hsl(245, 58%, 60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock by Grade */}
        <div className="bg-card rounded-lg border border-border shadow-soft p-6">
          <h3 className="font-semibold text-foreground mb-4">Units by Grade</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockByGrade}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {stockByGrade.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Status Distribution */}
        <div className="bg-card rounded-lg border border-border shadow-soft p-6 lg:col-span-2">
          <h3 className="font-semibold text-foreground mb-4">Stock Status Distribution</h3>
          <div className="grid grid-cols-3 gap-4">
            {stockByStatus.map((status, idx) => (
              <div
                key={status.name}
                className="text-center p-4 rounded-lg"
                style={{ backgroundColor: `${COLORS[idx]}10` }}
              >
                <p className="text-3xl font-bold" style={{ color: COLORS[idx] }}>
                  {status.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{status.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
