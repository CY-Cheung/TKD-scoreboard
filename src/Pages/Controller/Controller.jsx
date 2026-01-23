import "./Controller.css";
import Button from "../../Components/Button/Button";
import { useEffect, useRef } from "react";

function Controller() {
    const airconsole = useRef(null);

    useEffect(() => {
        // Initialize AirConsole
        airconsole.current = new window.AirConsole();

        // Listen for messages
        airconsole.current.onMessage = function (from, data) {
            const info = document.createElement("DIV");
            info.innerHTML = data;
            document.body.appendChild(info);
        };
    }, []);

    const handleSendMessage = () => {
        if (airconsole.current) {
            airconsole.current.message(window.AirConsole.SCREEN, "How are you?");
        }
    };

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
                <Button text="Send Message" onClick={handleSendMessage} fontSize="2dvw" />
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
