import { ACTIVITY_TAGS } from "@/lib/constants";
interface TagBadgeProps {
    tag: string;
    className?: string;
}
export default function TagBadge({ tag, className = "" }: TagBadgeProps) {
    // Convert tag to lowercase and find the corresponding tag object
    const tagKey = tag.toLowerCase();
    let tagObject = Object.values(ACTIVITY_TAGS).find(t => t.id === tagKey);
    // If no matching tag is found, use primary color
    if (!tagObject) {
        tagObject = {
            id: tagKey,
            label: tag,
            color: "bg-[hsl(var(--primary))]",
            icon: "",
        };
    }
    return (<span className={`${tagObject.color} text-white rounded-md text-xs px-2 py-0.5 inline-block ${className}`}>
      {tagObject.label.toUpperCase()}
    </span>);
}
