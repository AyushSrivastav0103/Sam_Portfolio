import React, { useState, useEffect } from 'react';
import { Lightbulb, Brain, Database, Zap } from 'lucide-react';

const SmartInsights = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Trigger animation after mount
        const timer = setTimeout(() => setVisible(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const insights = [
        {
            icon: Brain,
            color: "purple",
            title: "Model Selection",
            text: "Simpler models like Logistic Regression often outperform complex Neural Nets on structured data due to lower variance."
        },
        {
            icon: Database,
            color: "blue",
            title: "Data Quality",
            text: "80% of a data scientist's time is spent cleaning data. Garbage in, garbage out is the golden rule."
        },
        {
            icon: Zap,
            color: "orange",
            title: "Feature Engineering",
            text: "Domain knowledge beats algorithms. Creating the right features is often more impactful than hyperparameter tuning."
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {insights.map((item, index) => {
                const Icon = item.icon;
                return (
                    <div
                        key={index}
                        className={`
              relative bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/50
              transform transition-all duration-700 ease-out hover:-translate-y-2 hover:shadow-xl
              ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}
            `}
                        style={{ transitionDelay: `${index * 200}ms` }}
                    >
                        <div className={`absolute -top-6 left-6 p-3 rounded-xl bg-${item.color}-100 shadow-md`}>
                            <Icon className={`w-6 h-6 text-${item.color}-600`} />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                {item.text}
                            </p>
                        </div>
                        <div className={`absolute top-4 right-4 w-2 h-2 rounded-full bg-${item.color}-400 animate-pulse`} />
                    </div>
                );
            })}
        </div>
    );
};

export default SmartInsights;
