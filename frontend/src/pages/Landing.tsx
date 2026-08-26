import { Link } from 'react-router-dom'

export default function Landing() {
    return (
        <div className="landing">
            <section className="hero">
                <h2>Automatiza o que se repete</h2>
                <p>
                    Define uma regra uma vez. Sempre que o acontecimento se repetir,
                    a plataforma trata do resto.
                </p>
                <Link to="/register" className="cta">Começar</Link>
            </section>

            <section>
                <h3>Como funciona</h3>
                <div className="flow">
                    <div className="flow-step">
                        <span className="flow-label">WHEN</span>
                        <span>Order Created</span>
                    </div>
                    <div className="flow-arrow">&darr;</div>
                    <div className="flow-step">
                        <span className="flow-label">IF</span>
                        <span>Total &gt; 100</span>
                    </div>
                    <div className="flow-arrow">&darr;</div>
                    <div className="flow-step">
                        <span className="flow-label">DO</span>
                        <span>Send Notification</span>
                    </div>
                </div>
            </section>

            <section>
                <h3>O que podes fazer</h3>
                <div className="features">
                    <div className="feature">
                        <h4>Quatro triggers</h4>
                        <p>Pedidos, utilizadores, pagamentos e formulários.</p>
                    </div>
                    <div className="feature">
                        <h4>Condições</h4>
                        <p>Só age quando os dados do evento cumprem a regra.</p>
                    </div>
                    <div className="feature">
                        <h4>Histórico completo</h4>
                        <p>Cada execução fica registada com o evento e o resultado.</p>
                    </div>
                    <div className="feature">
                        <h4>Simulador</h4>
                        <p>Testa os workflows sem depender de sistemas externos.</p>
                    </div>
                </div>
            </section>

            <section className="cta-section">
                <h3>Pronto para começar?</h3>
                <Link to="/register" className="cta">Criar conta</Link>
                <p>
                    Já tens conta? <Link to="/login">Entrar</Link>
                </p>
            </section>

            <footer>
                <p>Workflow Automation Engine — projeto de portefólio</p>
            </footer>
        </div>
    )
}
