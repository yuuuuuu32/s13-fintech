package com.ssafy.BlueMarble.domain.game.repository;

import com.ssafy.BlueMarble.domain.game.entity.City;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CityRepository extends JpaRepository<City, Long> {
    
    /**
     * 모든 도시를 가격 순으로 정렬하여 조회
     */
    List<City> findAllByOrderByPriceAsc();
    
    /**
     * 도시 이름으로 조회
     */
    City findByName(String name);
    
    /**
     * 한국어 이름으로 조회
     */
    City findByKoreanName(String koreanName);
}
