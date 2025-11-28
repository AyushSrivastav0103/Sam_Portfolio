import React from 'react';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, Target, BarChart3, ArrowRight } from 'lucide-react';

/* ---------- Sample Data ---------- */
const forecastData = [
    { month: 'Jan', actual: 4200, forecast: 4100, lower: 3900, upper: 4300 },
    { month: 'Feb', actual: 4500, forecast: 4400, lower: 4200, upper: 4600 },
    { month: 'Mar', actual: 4800, forecast: 4750, lower: 4550, upper: 4950 },
    { month: 'Apr', actual: 5100, forecast: 5000, lower: 4800, upper: 5200 },
    { month: 'May', actual: null, forecast: 5300, lower: 5100, upper: 5500 },
    { month: 'Jun', actual: null, forecast: 5600, lower: 5400, upper: 5800 },
    { month: 'Jul', actual: null, forecast: 5900, lower: 5700, upper: 6100 },
    { month: 'Aug', actual: null, forecast: 6200, lower: 6000, upper: 6400 },
];

const mlModelData = [
    { model: 'Random Forest', accuracy: 0.89, precision: 0.87, recall: 0.85, f1: 0.86 },
    { model: 'XGBoost', accuracy: 0.92, precision: 0.91, recall: 0.89, f1: 0.90 },
    { model: 'Neural Net', accuracy: 0.88, precision: 0.86, recall: 0.87, f1: 0.865 },
    { model: 'LightGBM', accuracy: 0.91, precision: 0.90, recall: 0.88, f1: 0.89 },
    { model: 'SVM', accuracy: 0.85, precision: 0.84, recall: 0.83, f1: 0.84 },
];

const segmentationData = [
    { segment: 'High Value', recency: 10, frequency: 45, monetary: 5000, size: 120 },
    { segment: 'Medium Value', recency: 25, frequency: 25, monetary: 2000, size: 250 },
    { segment: 'Low Value', recency: 60, frequency: 8, monetary: 500, size: 400 },
    { segment: 'At Risk', recency: 90, frequency: 15, monetary: 1500, size: 180 },
    { segment: 'Lost', recency: 120, frequency: 2, monetary: 200, size: 100 },
];

const salesData = [
    { week: 'W1', sales: 12000, target: 11000 },
    { week: 'W2', sales: 14500, target: 13000 },
    { week: 'W3', sales: 13800, target: 14000 },
    { week: 'W4', sales: 16200, target: 15000 },
    { week: 'W5', sales: 15500, target: 15500 },
    { week: 'W6', sales: 17800, target: 16000 },
    { week: 'W7', sales: 18500, target: 17000 },
    { week: 'W8', sales: 19200, target: 18000 },
];

const DataVisualizations = () => {
    return (
        <section className="py-20 px-6 bg-white/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Analytics & Insights
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Interactive visualizations demonstrating my expertise in forecasting,
                        model evaluation, and customer segmentation.
                    </p>
                </div>

                <div className="space-y-12">
                    {/* Row 1: Sales Forecast (Full Width) */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-purple-100 hover:shadow-2xl transition-all duration-300">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-blue-100 rounded-2xl">
                                    <TrendingUp className="w-8 h-8 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-800">Sales Forecast</h3>
                                    <p className="text-gray-500">Predictive modeling with 95% confidence intervals</p>
                                </div>
                            </div>
                            {/* <button className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                                View Details <ArrowRight size={20} />
                            </button> */}
                        </div>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="month" stroke="#9ca3af" axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => [`$${value}`, '']}
                                    />
                                    <Legend iconType="circle" />
                                    <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorForecast)" name="Actual Sales" />
                                    <Area type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" fill="none" name="Forecast" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Row 2: Model Performance & Segmentation (Grid) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Model Performance */}
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-purple-100 hover:shadow-2xl transition-all duration-300">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-4 bg-purple-100 rounded-2xl">
                                    <BarChart3 className="w-8 h-8 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-800">Model Performance</h3>
                                    <p className="text-gray-500">Accuracy vs F1 Score across algorithms</p>
                                </div>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={mlModelData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                                        <XAxis type="number" domain={[0.8, 1]} stroke="#9ca3af" axisLine={false} tickLine={false} />
                                        <YAxis dataKey="model" type="category" width={100} stroke="#9ca3af" axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: '#f9fafb' }}
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend iconType="circle" />
                                        <Bar dataKey="accuracy" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={20} name="Accuracy" />
                                        <Bar dataKey="f1" fill="#ec4899" radius={[0, 6, 6, 0]} barSize={20} name="F1 Score" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Customer Segmentation */}
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-purple-100 hover:shadow-2xl transition-all duration-300">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-4 bg-teal-100 rounded-2xl">
                                    <Users className="w-8 h-8 text-teal-600" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-800">Customer Segments</h3>
                                    <p className="text-gray-500">RFM Analysis: Recency vs Monetary</p>
                                </div>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis type="number" dataKey="recency" name="Recency" unit="d" stroke="#9ca3af" axisLine={false} tickLine={false} />
                                        <YAxis type="number" dataKey="monetary" name="Monetary" unit="$" stroke="#9ca3af" axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ strokeDasharray: '3 3' }}
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend iconType="circle" />
                                        <Scatter name="Segments" data={segmentationData} fill="#8884d8">
                                            {segmentationData.map((entry, index) => (
                                                <cell key={`cell-${index}`} fill={['#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'][index % 5]} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Target Achievement (Full Width) */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-purple-100 hover:shadow-2xl transition-all duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-orange-100 rounded-2xl">
                                <Target className="w-8 h-8 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">Target Achievement</h3>
                                <p className="text-gray-500">Weekly sales performance against targets</p>
                            </div>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="week" stroke="#9ca3af" axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" />
                                    <Line type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={4} dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} name="Sales" />
                                    <Line type="monotone" dataKey="target" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Target" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default DataVisualizations;
