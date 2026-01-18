import "./Controller.css";
import Button from "../../Components/Button/Button";
import { useEffect } from "react";

function Controller() {
    useEffect(() => {
        // 初始化 AirConsole
        const airconsole = new window.AirConsole();

        // 綁定按鈕事件
        const btn = document.getElementById("btn-msg");
        if (btn) {
            btn.addEventListener("click", function () {
                airconsole.message(window.AirConsole.SCREEN, "How are you?");
            });
        }

        // 監聽訊息
        airconsole.onMessage = function (from, data) {
            const info = document.createElement("DIV");
            info.innerHTML = data;
            document.body.appendChild(info);
        };
    }, []);

    return (
        <div
            className="controller"
            onClick={() => document.documentElement.requestFullscreen()}
        >
            <div className="col">
                <Button text="Red 5" angle={350} fontSize="4vw" />
                <Button text="Red 4" angle={350} fontSize="4vw" />
                <Button text="Red 1" angle={350} fontSize="4vw" />
            </div>
            <div className="col">
                <Button text="Red 3" angle={350} fontSize="4vw" />
                <Button text="Red 2" angle={350} fontSize="4vw" />
            </div>
            <div className="col">
                <button id="btn-msg">Send Message</button>
            </div>
            <div className="col">
                <Button text="Blue 3" angle={210} fontSize="4vw" />
                <Button text="Blue 2" angle={210} fontSize="4vw" />
            </div>
            <div className="col">
                <Button text="Blue 5" angle={210} fontSize="4vw" />
                <Button text="Blue 4" angle={210} fontSize="4vw" />
                <Button text="Blue 1" angle={210} fontSize="4vw" />
            </div>
        </div>
    );
}

export default Controller;
