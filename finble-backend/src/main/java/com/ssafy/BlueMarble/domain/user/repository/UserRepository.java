package com.ssafy.BlueMarble.domain.user.repository;

import com.ssafy.BlueMarble.domain.user.dto.response.UserSearchResponseDTO;
import com.ssafy.BlueMarble.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    @Query("select new com.ssafy.BlueMarble.domain.user.dto.response.UserSearchResponseDTO(u.id, u.nickname) from User u where u.nickname = :nickname")
    UserSearchResponseDTO findByNickname(String nickname);
}
