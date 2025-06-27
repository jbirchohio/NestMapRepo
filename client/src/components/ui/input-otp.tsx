import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Dot } from "lucide-react";
import { cn } from "@/lib/utils";
/**
 * A component for inputting one-time passwords. It renders a group of slots,
 * each of which can contain a single character. The component automatically
 * focuses the next slot when the user types a character, and automatically
 * moves to the previous slot when the user presses backspace.
 *
 * The component also renders a separator between the slots, which can be
 * customized using the `separator` prop.
 *
 * @example
 * <InputOTP numDigits={6} />
 *
 * @type {React.ForwardRefExoticComponent<
 *   React.PropsWithoutRef<React.ComponentPropsWithoutRef<typeof OTPInput>> &
 *   React.RefAttributes<React.ElementRef<typeof OTPInput>>
 * >}
 */
const InputOTP = React.forwardRef<React.ElementRef<typeof OTPInput>, React.ComponentPropsWithoutRef<typeof OTPInput>>(({ className, containerClassName, ...props }, ref) => (<OTPInput ref={ref} containerClassName={cn("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)} className={cn("disabled:cursor-not-allowed", className)} {...props}/>));
InputOTP.displayName = "InputOTP";
const InputOTPGroup = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(({ className, ...props }, ref) => (<div ref={ref} className={cn("flex items-center", className)} {...props}/>));
InputOTPGroup.displayName = "InputOTPGroup";
interface OTPInputSlotProps {
    char: string;
    hasFakeCaret: boolean;
    isActive: boolean;
}

interface OTPInputContextValue {
    slots: OTPInputSlotProps[];
    [key: string]: unknown; // For other context properties we might not be using
}

const InputOTPSlot = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div"> & {
    index: number;
}>(({ index, className, ...props }, ref) => {
    const inputOTPContext = React.useContext(OTPInputContext) as OTPInputContextValue;
    const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index] || {
        char: '',
        hasFakeCaret: false,
        isActive: false
    };
    return (<div ref={ref} className={cn("relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md", isActive && "z-10 ring-2 ring-ring ring-offset-background", className)} {...props}>
      {char}
      {hasFakeCaret && (<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000"/>
        </div>)}
    </div>);
});
InputOTPSlot.displayName = "InputOTPSlot";
const InputOTPSeparator = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(({ ...props }, ref) => (<div ref={ref} role="separator" {...props}>
    <Dot />
  </div>));
InputOTPSeparator.displayName = "InputOTPSeparator";
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
