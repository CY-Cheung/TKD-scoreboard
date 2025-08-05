import React from "react";
import "./Button.css";

function Button({ text = "Button Text", fontSize = "1rem", angle = 270, step = 10 }) {
	return (
		<button
			style={{
				"--font-size": fontSize,
				"--angle": angle,
        "--step": step,
			}}
		>
			{text}
		</button>
	);
}

export default Button;
