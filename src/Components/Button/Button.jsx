import "./Button.css";

// 將 HSL 轉 HEX
function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) [r, g, b] = [c, x, 0];
    else if (60 <= h && h < 120) [r, g, b] = [x, c, 0];
    else if (120 <= h && h < 180) [r, g, b] = [0, c, x];
    else if (180 <= h && h < 240) [r, g, b] = [0, x, c];
    else if (240 <= h && h < 300) [r, g, b] = [x, 0, c];
    else if (300 <= h && h < 360) [r, g, b] = [c, 0, x];
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}

function Button({
    text = "Button Text",
    fontSize = "1vw",
    angle = 270,
    step = 10,
    gradient,
    onClick
}) {
    // 如果有 gradient prop，直接用
    let gradientColors = gradient;
    // 否則用 angle/step 計算三組顏色
    if (!gradientColors) {
        const h1 = angle % 360;
        const h2 = (angle + step) % 360;
        const h3 = (angle + step * 2) % 360;
        gradientColors = [
            hslToHex(h1, 100, 50),
            hslToHex(h2, 100, 20),
            hslToHex(h3, 100, 50)
        ];
    }
    // 組成 linear-gradient 字串
    const gradientString = `linear-gradient(135deg, ${gradientColors.join(", ")})`;

    return (
        <button
            className="cursor-target"
            style={{
                "--font-size": fontSize,
                "--button-gradient": gradientString,
            }}
            onClick={onClick}
        >
            {text}
        </button>
    );
}

export default Button;
