-- Insertar roles básicos
INSERT INTO role (name)
VALUES 
  ('student'),
  ('teacher'),
  ('admin'),
  ('superAdmin');

-- Obtener el ID del rol superAdmin para asignarlo al usuario
DO $$
DECLARE
    super_admin_role_id UUID;
BEGIN
    SELECT id INTO super_admin_role_id FROM role WHERE name = 'superAdmin';

    -- Insertar usuario superAdmin
    INSERT INTO "user" (
        "firstName",
        "lastName",
        email,
        password,
        "phoneNumber",
        "avatarPath",
        "rolId",
        "isDeleted"
    ) VALUES (
        'Jhonatan',
        'Peñaranda',
        'jgpandia1@gmail.com',
        -- Contraseña: Admin123. (hasheada con bcrypt)
        '$2a$12$HkDIIO3miLOE5PGOhrPFQueNqOriedwu5qzIcdAI1vdNp4G6pKWNC',
        63924440,
        NULL,
        super_admin_role_id,
        FALSE
    );
END $$;