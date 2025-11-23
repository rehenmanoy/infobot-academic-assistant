import bcrypt

class Password_Encoder:

    def create_password_hash(self, password):
        try:
            salt = bcrypt.gensalt()
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
            return hashed_password.decode('utf-8')
        except Exception as e:
            return None

    def validate_password_hash(self, password, password_hash):
        try:
            password_hash_bytes = password_hash.encode('utf-8')
            if bcrypt.checkpw(password.encode('utf-8'), password_hash_bytes):
                return True
            else:
                return False
        except Exception as e:
            return None


