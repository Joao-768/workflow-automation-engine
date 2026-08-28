import { Link } from 'react-router-dom'

export default function Landing() {
    return (
        <>
            <header className="rail">
                <div className="wrap">
                    <span className="mark">Workflow Engine</span>
                    <div className="whoami">
                        <Link to="/login">Sign in</Link>
                        <Link to="/register" className="btn btn-primary btn-sm">Create account</Link>
                    </div>
                </div>
            </header>

            <div className="wrap">
                <section className="hero">
                    <span className="plate">Event-driven automation engine</span>
                    <h1>A signal comes in. <em>An action goes out.</em></h1>
                    <p className="lead">
                        Wire it up once. Every event that arrives passes through the gate,
                        and whatever gets through fires the action — with a record of it all.
                    </p>


                    <div className="hero-actions">
                        <Link to="/register" className="btn btn-primary">Create account</Link>
                        <Link to="/login" className="btn">Sign in</Link>
                    </div>
                </section>

                <section className="specs">
                    <div className="spec">
                        <span className="plate">Inputs</span>
                        <h3>Four triggers</h3>
                        <p>Orders, users, payments and forms.</p>
                    </div>
                    <div className="spec">
                        <span className="plate">Gate</span>
                        <h3>Optional condition</h3>
                        <p>Compares a field from the event. If it doesn't pass, the circuit stays open.</p>
                    </div>
                    <div className="spec">
                        <span className="plate">Record</span>
                        <h3>Full trace</h3>
                        <p>Every pass stores the event, the path it took and the result.</p>
                    </div>
                </section>

                <footer className="base">
                    <span>Workflow Automation Engine</span>
                    <span>portfolio project</span>
                </footer>
            </div>
        </>
    )
}
