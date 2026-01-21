"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileText, Image as ImageIcon, FileUp, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface AnalyticsData {
  totalDocuments: number;
  pdfCount: number;
  docxCount: number;
  imageCount: number;
  completedCount: number;
  processingCount: number;
  failedCount: number;
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalDocuments: 0,
    pdfCount: 0,
    docxCount: 0,
    imageCount: 0,
    completedCount: 0,
    processingCount: 0,
    failedCount: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("documents")
      .select("file_type, status")
      .eq("user_id", user.id);

    if (error || !data) return;

    const stats = {
      totalDocuments: data.length,
      pdfCount: data.filter(d => d.file_type === "application/pdf").length,
      docxCount: data.filter(d => d.file_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document").length,
      imageCount: data.filter(d => d.file_type.startsWith("image/")).length,
      completedCount: data.filter(d => d.status === "completed").length,
      processingCount: data.filter(d => d.status === "processing").length,
      failedCount: data.filter(d => d.status === "failed").length,
    };

    setAnalytics(stats);
  };

  const statCards = [
    {
      title: "Total Documents",
      value: analytics.totalDocuments,
      icon: FileUp,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      title: "PDF Files",
      value: analytics.pdfCount,
      icon: FileText,
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50",
      textColor: "text-red-600",
    },
    {
      title: "DOCX Files",
      value: analytics.docxCount,
      icon: FileText,
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600",
    },
    {
      title: "Images",
      value: analytics.imageCount,
      icon: ImageIcon,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-4 rounded-2xl ${stat.bgColor}`}>
                  <stat.icon className={`w-8 h-8 ${stat.textColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Overview */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Completed</span>
              <div className="flex items-center gap-3">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${analytics.totalDocuments > 0 ? (analytics.completedCount / analytics.totalDocuments) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                  {analytics.completedCount}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Processing</span>
              <div className="flex items-center gap-3">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${analytics.totalDocuments > 0 ? (analytics.processingCount / analytics.totalDocuments) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                  {analytics.processingCount}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Failed</span>
              <div className="flex items-center gap-3">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${analytics.totalDocuments > 0 ? (analytics.failedCount / analytics.totalDocuments) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                  {analytics.failedCount}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
