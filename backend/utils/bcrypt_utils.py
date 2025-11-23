import bcrypt

class Password_Encoder():
    def create_password_hash(self, password):
        try:
            salt = bcrypt.gensalt()
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
            return hashed_password.decode('utf-8')
        except Exception as e:
            print(f"Error while creating password hash: {e}")
            return None

    def validate_password_hash(self, password, password_hash):
        try:
            password_hash_bytes = password_hash.encode('utf-8')
            if bcrypt.checkpw(password.encode('utf-8'), password_hash_bytes):
                print("Correct password")
                return True

            else:
                return False
        except Exception as e:
            print(f"Error while validating password hash: {e}")
            return None


Pass = Password_Encoder()
password =Pass.create_password_hash('testpass')
print(password)
Pass.validate_password_hash('amalsiby@2022it','$2b$12$YwWbrOkhwmEEzk4ZVmDmb.mN59BivS3fxSh8gxeeH0GE4ikE4loRO')