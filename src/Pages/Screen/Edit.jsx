import "./Edit.css";
import Button from "../../Components/Button/Button";
import { useState } from "react";
import Mask from "../../Components/Mask/Mask";
import Card from "../../Components/Card/Card";
import "../../Components/Card/Card.css";

function Edit({ visible, setVisible }) {
    if (!visible) return null;
    const cardWidth = 28;
    const buttonFontSize = cardWidth/20; // 只存數字

    return (
        <>
            <Mask />
            <div className="edit" onClick={() => document.documentElement.requestFullscreen()}>
                <div className="cards">
                    <Card
                        color1="var(--blue-primary)"
                        width={cardWidth}
                    >
                        <h1>Blue 藍方</h1>
                        <div className="rows">
                            <div className="row">
                                <p>Gam-jeom 扣分</p>
                                <div className="buttons">
                                    <Button
                                        text="+"
                                        angle={210}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                    <Button
                                        text="−"
                                        angle={210}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <p>Punch 拳擊 - 1</p>
                                <div className="buttons">
                                    <Button
                                        text="+"
                                        angle={210}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                    <Button
                                        text="−"
                                        angle={210}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <p>Body 軀幹 - 2</p>
                                <div className="buttons">
                                    <Button
                                        text="+"
                                        angle={210}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                    <Button
                                        text="−"
                                        angle={210}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <p>Head 頭部 - 3</p>
                                <div className="buttons">
                                    <Button
                                        text="+"
                                        angle={210}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                    <Button
                                        text="−"
                                        angle={210}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <p>Body(Turn) 軀幹(轉身) - 4</p>
                                <div className="buttons">
                                    <Button
                                        text="+"
                                        angle={210}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                    <Button
                                        text="−"
                                        angle={210}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <p>Head(Turn) 頭部(轉身) - 5</p>
                                <div className="buttons">
                                    <Button
                                        text="+"
                                        angle={210}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                    <Button
                                        text="−"
                                        angle={210}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                    <Card
                        color1="var(--yellow-primary)"
                        width={cardWidth}
                    >
                        <h1>Edit 編輯</h1>
                        <div className="rows">
                            <p>Match Time 比賽時間</p>
                            <p>Rest Time 休息時間</p>
                            <p>Kye-shi 計時</p>
                            <p>Change Round 變更回合</p>
                        </div>
                    </Card>
                    <Card
                        color1="var(--red-primary)"
                        width={cardWidth}
                    >
                        <h1>Red 紅方</h1>
                        <div className="rows">
                            <div className="row">
                                <p>Gam-jeom 扣分</p>
                                <div className="buttons">
                                    <Button
                                        text="+"
                                        angle={350}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                    <Button
                                        text="−"
                                        angle={350}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <p>Punch 拳擊 - 1</p>
                                <div className="buttons">
                                    <Button
                                        text="+"
                                        angle={350}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                    <Button
                                        text="−"
                                        angle={350}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <p>Body 軀幹 - 2</p>
                                <div className="buttons">
                                    <Button
                                        text="+"
                                        angle={350}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                    <Button
                                        text="−"
                                        angle={350}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <p>Head 頭部 - 3</p>
                                <div className="buttons">
                                    <Button
                                        text="+"
                                        angle={350}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                    <Button
                                        text="−"
                                        angle={350}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <p>Body(Turn) 軀幹(轉身) - 4</p>
                                <div className="buttons">
                                    <Button
                                        text="+"
                                        angle={350}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                    <Button
                                        text="−"
                                        angle={350}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <p>Head(Turn) 頭部(轉身) - 5</p>
                                <div className="buttons">
                                    <Button
                                        text="+"
                                        angle={350}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                    <Button
                                        text="−"
                                        angle={350}
                                        fontSize={`${buttonFontSize}vw`}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
                <div className="done-button">
                    <Button
                        text="Done"
                        angle={270}
                        fontSize="2.5vw"
                        onClick={() => setVisible(false)}
                    />
                </div>
            </div>
        </>
    );
}

export default Edit;
