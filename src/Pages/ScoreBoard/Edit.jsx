import "./Edit.css";
import Button from "../../Components/Button/Button";

function Edit({ visible, setVisible }) {
    if (!visible) return null; // 不顯示時直接不渲染
    return (
        <div className="edit">
            Edit <Button text="Done" onClick={() => setVisible(false)} />
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
