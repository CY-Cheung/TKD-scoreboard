import "./Button.css";

function Button({ text = "Button Text", fontSize = "1rem", angle = 270, step = 10, onClick }) {
	return (
		<button
			style={{
				"--font-size": fontSize,
				"--angle": angle,
        		"--step": step,
			}}
			onClick={onClick}
		>
			{text}
		</button>
	);
}

export default Button;
