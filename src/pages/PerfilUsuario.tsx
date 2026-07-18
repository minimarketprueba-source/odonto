
import { useAuth } from "@/context/auth-context";

export default function PerfilUsuario() {
    const { user } = useAuth();
    return (
        <div>
            <h2>Perfil de Usuario</h2>
            <p>Email: {user?.email}</p>
            <p>ID: {user?.id}</p>
        </div>
    );
}
