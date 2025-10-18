# Sistema de Diseño ARTYCO Financial

## Paleta de Colores

### Tema Claro (Profesional)
- **Backgrounds**: `#F8FAFC`, `#F1F5F9`, `#FFFFFF`
- **Primary**: `#1a365d` (azul corporativo)
- **Secondary**: `#2c5282` 
- **Accent**: `#3182ce`
- **Warning**: `#D97706`
- **Danger**: `#DC2626`

### Tema Oscuro (JARVIS Cyberpunk)
- **Backgrounds**: `#0A0A0F`, `#111118`, `#1A1A25`
- **Primary**: `#00F0FF` (cyan neón)
- **Secondary**: `#0080FF`
- **Accent**: `#00FF99` (verde neón)
- **Warning**: `#FFB800`
- **Danger**: `#FF0080`

## Componentes Base

### Glass Cards
```css
.glass-card {
  backdrop-filter: blur(12px);
  background: var(--color-card);
  border: 1px solid var(--color-border);
}
```

### Cyber Buttons
```css
.cyber-button {
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: white;
  transition: all 0.2s ease;
}
```

### Neon Text (solo en modo oscuro)
```css
.neon-text {
  color: var(--color-primary);
  text-shadow: 0 0 5px currentColor; /* solo en dark mode */
}
```

## Variables CSS Dinámicas

El sistema usa variables CSS que cambian automáticamente según el tema:

- `--color-bg`: Fondo principal
- `--color-surface`: Fondo secundario
- `--color-card`: Fondo de tarjetas
- `--color-primary`: Color principal
- `--color-text-primary`: Texto principal
- `--color-border`: Bordes

## Uso Recomendado

1. **Siempre usar las variables CSS** en lugar de colores hardcodeados
2. **Aplicar clases de utilidad** como `glass-card`, `cyber-button`, `neon-text`
3. **Usar el sistema de sombras** definido en Tailwind config
4. **Aplicar transiciones** para cambios suaves entre temas

## Módulo Status Producción

Todos los componentes del módulo han sido actualizados para:
- Usar el sistema de colores consistente
- Aplicar efectos glass y hologram apropiados
- Mantener legibilidad en ambos temas
- Usar micro-interacciones sutiles

## Testing

Para verificar la coherencia:
1. Alternar entre tema claro y oscuro
2. Verificar contraste de texto
3. Comprobar que todos los elementos son interactivos
4. Asegurar que no hay elementos "perdidos" por falta de contraste