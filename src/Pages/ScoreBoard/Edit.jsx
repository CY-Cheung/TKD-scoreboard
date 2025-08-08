import "./Edit.css";
import Button from "../../Components/Button/Button";

function Edit({ hidden = true, setHidden }) {
    return (
        <div className="edit" style={{ visibility: hidden ? "hidden" : "visible" }}>
            <div>
                Edit{" "}
                <Button
                    text="Done"
                    angle={100}
                    onClick={() => setHidden(true)}
                />
            </div>
            <div className="edit-score">
                <div className="column">Score</div>
                <div className="column">Gam-jeom</div>
                <div className="column">Punch</div>
                <div className="column">Body</div>
                <div className="column">Head</div>
                <div className="column">Body (Tech)</div>
                <div className="column">Head (Tech)</div>
            </div>
            <div>
                Blue
                <Button text="Gam-jeom" angle={190} />
                <Button text="Punch" angle={190} />
                <Button text="Body" angle={190} />
                <Button text="Head" angle={190} />
                <Button text="Spin Body" angle={190} />
                <Button text="Spin Head" angle={190} />
            </div>
            <div>
                Red
                <Button text="Gam-jeom" angle={350} />
                <Button text="Punch" angle={350} />
                <Button text="Body" angle={350} />
                <Button text="Head" angle={350} />
                <Button text="Spin Body" angle={350} />
                <Button text="Spin Head" angle={350} />
            </div>
        </div>
    );
}

export default Edit;
