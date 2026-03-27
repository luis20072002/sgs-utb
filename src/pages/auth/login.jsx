export default function Login() {
  return (
    <div className="container">
      <h2>Iniciar Sesión</h2>

      <form>
        <div>
          <label>Correo</label>
          <input type="email" placeholder="Ingrese su correo" />
        </div>

        <div>
          <label>Contraseña</label>
          <input type="password" placeholder="Ingrese su contraseña" />
        </div>

        <button type="submit">Ingresar</button>
      </form>

      <p>
        ¿No tienes cuenta? <a href="/register">Regístrate</a>
      </p>
    </div>
  );
}