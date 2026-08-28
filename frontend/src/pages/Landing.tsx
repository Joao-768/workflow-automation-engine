import { Link } from 'react-router-dom'

export default function Landing() {
    return (
        <>
            <header className="rail">
                <div className="wrap">
                    <span className="mark">Workflow Engine</span>
                    <div className="whoami">
                        <Link to="/login">Entrar</Link>
                        <Link to="/register" className="btn btn-primary btn-sm">Criar conta</Link>
                    </div>
                </div>
            </header>

            <div className="wrap">
                <section className="hero">
                    <span className="plate">Motor de automação por eventos</span>
                    <h1>Um sinal entra. <em>A ação sai.</em></h1>
                    <p className="lead">
                        Fecha o circuito uma vez. Cada evento que chega passa pela porta,
                        e o que a atravessa dispara a ação — com registo de tudo o que passou.
                    </p>


                    <div className="hero-actions">
                        <Link to="/register" className="btn btn-primary">Criar conta</Link>
                        <Link to="/login" className="btn">Entrar</Link>
                    </div>
                </section>

                <section className="specs">
                    <div className="spec">
                        <span className="plate">Entradas</span>
                        <h3>Quatro gatilhos</h3>
                        <p>Encomendas, utilizadores, pagamentos e formulários.</p>
                    </div>
                    <div className="spec">
                        <span className="plate">Porta</span>
                        <h3>Condição opcional</h3>
                        <p>Compara um campo do evento. Se não passar, o circuito fica aberto.</p>
                    </div>
                    <div className="spec">
                        <span className="plate">Registo</span>
                        <h3>Traço completo</h3>
                        <p>Cada passagem guarda o evento, o percurso e o resultado.</p>
                    </div>
                </section>

                <footer className="base">
                    <span>Workflow Automation Engine</span>
                    <span>projeto de portefólio</span>
                </footer>
            </div>
        </>
    )
}
