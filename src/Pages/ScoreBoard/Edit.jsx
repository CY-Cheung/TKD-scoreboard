import "./Edit.css";
import Button from "../../Components/Button/Button";

function Edit({ visible, setVisible }) {
    if (!visible) return null; // 不顯示時直接不渲染
    return (
        <div className="edit">
            <h2>Edit</h2>
            <div className="edit-score">
                <div className="column">
                    <div>Score</div>
                    <div>Blue</div>
                    <div>Red</div>
                </div>
                <div className="column">
                    <div>Gam-jeom</div>
                    <div className="edit-score-button"><Button text={"+1"} angle={210} fontSize={"1.25vw"}/><Button text={"-1"} angle={210} fontSize={"1.25vw"}/></div>
                    <div className="edit-score-button"><Button text={"+1"} angle={350} fontSize={"1.25vw"}/><Button text={"-1"} angle={350} fontSize={"1.25vw"}/></div>
                </div>
                <div className="column">
                    <div>Punch (1)</div>
                    <div className="edit-score-button"><Button text={"+1"} angle={210} fontSize={"1.25vw"}/><Button text={"-1"} angle={210} fontSize={"1.25vw"}/></div>
                    <div className="edit-score-button"><Button text={"+1"} angle={350} fontSize={"1.25vw"}/><Button text={"-1"} angle={350} fontSize={"1.25vw"}/></div>
                </div>
                <div className="column">
                    <div>Body (2)</div>
                    <div className="edit-score-button"><Button text={"+1"} angle={210} fontSize={"1.25vw"}/><Button text={"-1"} angle={210} fontSize={"1.25vw"}/></div>
                    <div className="edit-score-button"><Button text={"+1"} angle={350} fontSize={"1.25vw"}/><Button text={"-1"} angle={350} fontSize={"1.25vw"}/></div>
                </div>
                <div className="column">
                    <div>Head (3)</div>
                    <div className="edit-score-button"><Button text={"+1"} angle={210} fontSize={"1.25vw"}/><Button text={"-1"} angle={210} fontSize={"1.25vw"}/></div>
                    <div className="edit-score-button"><Button text={"+1"} angle={350} fontSize={"1.25vw"}/><Button text={"-1"} angle={350} fontSize={"1.25vw"}/></div>
                </div>
                <div className="column">
                    <div>Tech Body (4)</div>
                    <div className="edit-score-button"><Button text={"+1"} angle={210} fontSize={"1.25vw"}/><Button text={"-1"} angle={210} fontSize={"1.25vw"}/></div>
                    <div className="edit-score-button"><Button text={"+1"} angle={350} fontSize={"1.25vw"}/><Button text={"-1"} angle={350} fontSize={"1.25vw"}/></div>
                </div>
                <div className="column">
                    <div>Tech Head (5)</div>
                    <div className="edit-score-button"><Button text={"+1"} angle={210} fontSize={"1.25vw"}/><Button text={"-1"} angle={210} fontSize={"1.25vw"}/></div>
                    <div className="edit-score-button"><Button text={"+1"} angle={350} fontSize={"1.25vw"}/><Button text={"-1"} angle={350} fontSize={"1.25vw"}/></div>
                </div>
            </div>
            <Button text="Done" onClick={() => setVisible(false)} />
        </div>
    );
}

export default Edit;
