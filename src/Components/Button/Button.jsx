import React from "react";
import "./Button.css";

function Button({
    text,
    children,
    icon,
    fontSize = "1cqi",
    angle = 270,
    step = 40,
    gradient,
    variant,
    onClick,
    type = "button",
    disabled = false,
    className = "",
    style = {},
    ...restProps
}) {
    let gradientString = gradient;

    if (!gradientString) {
        if (variant === "gemini") {
            gradientString = "linear-gradient(135deg, #4f46e5, #8b5cf6, #ec4899, #f43f5e)";
        } else if (variant === "orange") {
            gradientString = "linear-gradient(135deg, #f97316, #d97706, #f59e0b)";
        } else {
            const h1 = angle % 360;
            const h2 = (angle + step) % 360;
            gradientString = `linear-gradient(135deg, hsl(${h1}, 90%, 55%), hsl(${h2}, 90%, 55%))`;
        }
    } else if (Array.isArray(gradientString)) {
        gradientString = `linear-gradient(135deg, ${gradientString.join(", ")})`;
    }

    return (
        <button
            type={type}
            disabled={disabled}
            className={`tkd-btn cursor-target ${className}`}
            style={{
                "--font-size": fontSize,
                "--button-gradient": gradientString,
                ...style
            }}
            onClick={onClick}
            {...restProps}
        >
            {icon && <span className="tkd-btn-icon">{icon}</span>}
            {children || text}
        </button>
    );
}

export default Button;
