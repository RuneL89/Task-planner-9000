import { useMemo } from "react";
import { format, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, isMonday, isTuesday, isWednesday, isThursday, isFriday } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DatePickerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
}

export function DatePickerPopup({ isOpen, onClose, onSelectDate }: DatePickerPopupProps) {
  const weekdays = useMemo(() => {
    const today = new Date();

    const getNextWeekday = (dayName: string): Date => {
      const currentDay = today.getDay();
      
      switch (dayName) {
        case "Monday":
          if (isMonday(today)) {
            return today;
          }
          return nextMonday(today);
        case "Tuesday":
          if (isTuesday(today)) {
            return today;
          }
          return nextTuesday(today);
        case "Wednesday":
          if (isWednesday(today)) {
            return today;
          }
          return nextWednesday(today);
        case "Thursday":
          if (isThursday(today)) {
            return today;
          }
          return nextThursday(today);
        case "Friday":
          if (isFriday(today)) {
            return today;
          }
          return nextFriday(today);
        default:
          return today;
      }
    };

    return [
      { name: "Monday", date: getNextWeekday("Monday") },
      { name: "Tuesday", date: getNextWeekday("Tuesday") },
      { name: "Wednesday", date: getNextWeekday("Wednesday") },
      { name: "Thursday", date: getNextWeekday("Thursday") },
      { name: "Friday", date: getNextWeekday("Friday") },
    ];
  }, [isOpen]);

  const handleSelectDate = (date: Date) => {
    onSelectDate(date);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md"
        data-testid="date-picker-popup"
      >
        <DialogHeader>
          <DialogTitle>Schedule for this week</DialogTitle>
          <DialogDescription className="sr-only">
            Select a weekday to schedule your task
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-2">
          {weekdays.map((weekday) => (
            <Button
              key={weekday.name}
              variant="outline"
              size="lg"
              className="w-full justify-start text-left h-auto py-4"
              data-testid={`button-${weekday.name.toLowerCase()}`}
              onClick={() => handleSelectDate(weekday.date)}
            >
              <div className="flex flex-col">
                <span className="font-semibold text-base">{weekday.name}</span>
                <span className="text-sm text-muted-foreground">
                  {format(weekday.date, "MMMM d, yyyy")}
                </span>
              </div>
            </Button>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
