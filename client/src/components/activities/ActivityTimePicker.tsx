import React, { useState } from "react";
import { TimePicker } from "@/components/ui/time-picker";
interface ActivityTimePickerProps {
    setValue: (field: string, value: string) => void;
}
export default function ActivityTimePicker({ setValue }: ActivityTimePickerProps) {
    const [time, setTime] = useState<string>("");
    const handleTimeChange = (time: string) => {
        setTime(time);
        setValue("time", time);
    };
    return <TimePicker value={time} onChange={handleTimeChange}/>;
}
