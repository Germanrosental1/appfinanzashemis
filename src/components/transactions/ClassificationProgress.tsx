
import { Progress } from "@/components/ui/progress";
import { ClassificationStats } from "@/types";

interface ClassificationProgressProps {
  stats: ClassificationStats;
}

const ClassificationProgress = ({ stats }: ClassificationProgressProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Classification Progress</p>
        <span className="text-sm font-medium">
          {stats.classified}/{stats.total}
        </span>
      </div>
      <Progress value={stats.percentComplete} className="h-2" />
      <div className="flex justify-between text-xs text-gray-500">
        <div>
          {stats.percentComplete === 100 
            ? "All transactions have been classified!" 
            : `${stats.pending} pending transactions`}
        </div>
        <div>{Math.round(stats.percentComplete)}% completed</div>
      </div>
    </div>
  );
};

export default ClassificationProgress;
