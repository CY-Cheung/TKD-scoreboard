import { useNavigate } from 'react-router-dom';
import PunchIcon from '../../assets/icons/PunchIcon.png';
import TrunkIcon from '../../assets/icons/TrunkIcon.png';
import HelmetIcon from '../../assets/icons/HelmetIcon.png';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  const scrollToHow = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing">
      <section className="landing-hero" aria-label="TKD Scoreboard hero">
        <div className="landing-hero-visual" aria-hidden="true">
          <div className="landing-mat landing-mat-blue">
            <span className="landing-score landing-score-blue">12</span>
            <span className="landing-side-label">Chung</span>
          </div>
          <div className="landing-mat-center">
            <div className="landing-timer">1:28</div>
            <div className="landing-icon-row">
              <img src={PunchIcon} alt="" className="landing-score-icon" />
              <img src={TrunkIcon} alt="" className="landing-score-icon" />
              <img src={HelmetIcon} alt="" className="landing-score-icon" />
            </div>
          </div>
          <div className="landing-mat landing-mat-red">
            <span className="landing-score landing-score-red">9</span>
            <span className="landing-side-label">Hung</span>
          </div>
          <div className="landing-mat-grain" />
        </div>

        <div className="landing-hero-copy">
          <p className="landing-brand">TKD Scoreboard</p>
          <h1 className="landing-headline">場上即時計分，多裝置同步開波。</h1>
          <p className="landing-subcopy">
            Admin 建賽載入、大螢幕顯示、手機掃碼按分——經 Firebase 即時同步，全場同一分數。
          </p>
          <div className="landing-cta-group">
            <button
              type="button"
              className="landing-cta landing-cta-primary cursor-target"
              onClick={() => navigate('/court-setup')}
            >
              開始設定場地
            </button>
            <button
              type="button"
              className="landing-cta landing-cta-secondary cursor-target"
              onClick={scrollToHow}
            >
              了解點運作
            </button>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-how" aria-labelledby="how-heading">
        <h2 id="how-heading" className="landing-how-title">點樣運作</h2>
        <p className="landing-how-lead">
          純前端網頁：冇獨立伺服器程式。所有裝置透過 Firebase Realtime Database (即時資料庫) 同步同一場賽事。
        </p>
        <ol className="landing-flow">
          <li>
            <span className="landing-flow-step">1</span>
            <div>
              <strong>Admin</strong>
              <p>建 Event／Court，載入 Match 到場地。</p>
            </div>
          </li>
          <li>
            <span className="landing-flow-step">2</span>
            <div>
              <strong>Screen</strong>
              <p>大螢幕顯示分數同計時；出 QR 俾裁判掃。</p>
            </div>
          </li>
          <li>
            <span className="landing-flow-step">3</span>
            <div>
              <strong>Controller</strong>
              <p>手機搶席按分；寫入 Firebase，全場即時跟住變。</p>
            </div>
          </li>
        </ol>
        <p className="landing-how-en">
          Live court scoring. Every device in sync — admins load the match, the Screen runs the board, judges score from their phones.
        </p>
        <button
          type="button"
          className="landing-cta landing-cta-primary cursor-target"
          onClick={() => navigate('/court-setup')}
        >
          Set up a court
        </button>
      </section>
    </div>
  );
}

export default Landing;
